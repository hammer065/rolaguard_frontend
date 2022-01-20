import React, { useState, useEffect, useContext } from "react";
import { MobXProviderContext, observer } from "mobx-react";

import {
  Segment,
  Grid,
  Pagination,
  Label,
  Button,
  Icon,
  Dropdown,
  Menu,
} from "semantic-ui-react";
import LoaderComponent from "../utils/loader.component";

import "./resource-usage.component.css";
import ResourceUssageGraph from "./graphs/resource-usage.graph.component";
import ResourceUsageList from "./resource-usage-list.component";
import _ from "lodash";
import AssetShowSearchComponent from "../utils/asset/asset-show-search.component";

const ResourceUsageComponent = (props) => {
  const { resourceUsageStore } = useContext(MobXProviderContext);
  const [showFilters, setShowFilters] = useState(true);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState(null);

  const clearFilters = () => {
    // clean all criteria filtering
    resourceUsageStore.deleteCriteria();
  };

  const handlePageSizeChange = (e, data) => {
    resourceUsageStore.setPageSize(data.value);
    resourceUsageStore.getDataListFromApi();
  };

  const deleteFilter = (k, v) => {
    // delete specific filter applied from criteria
    let criteriaToDelete = {};
    criteriaToDelete[k] = v;
    resourceUsageStore.deleteCriteria(criteriaToDelete);
  };

  const showAppliedFilters = () => {
    // show filters applied on filter list
    let labels = [];
    for (const [key, value] of Object.entries(
      resourceUsageStore.getCriteria()
    )) {
      if (!_.isEmpty(value)) {
        switch (key) {
          case "status":
          case "type":
            labels.push(
              <Label
                as="a"
                key={key}
                className="text-uppercase"
                onClick={() => {
                  deleteFilter(key, value);
                }}
              >
                {key}: <strong>{value}</strong>
                <Icon name="delete" />
              </Label>
            );
            break;
          case "gateways":
            value.forEach((gatewayInfo) => {
              labels.push(
                <Label
                  as="a"
                  key={gatewayInfo.label}
                  className="text-uppercase"
                  onClick={() => {
                    deleteFilter(key, gatewayInfo);
                  }}
                >
                  {key}: <strong>{gatewayInfo.label}</strong>
                  <Icon name="delete" />
                </Label>
              );
            });
            break;
          case "packet_lost_range":
            if (value.from !== 0 || value.to !== 100) {
              labels.push(
                <Label
                  as="a"
                  key={key}
                  className="text-uppercase"
                  onClick={() => {
                    deleteFilter(key, value);
                  }}
                >
                  {key.replace(/_+/gm, ` `)}:{" "}
                  <strong>
                    {value.from}-{value.to}%
                  </strong>
                  <Icon name="delete" />
                </Label>
              );
            }
            break;
          case "signal_strength":
            if (value.from !== -150 || value.to !== 0) {
              labels.push(
                <Label
                  as="a"
                  key={key}
                  className="text-uppercase"
                  onClick={() => {
                    deleteFilter(key, value);
                  }}
                >
                  {key.replace(/_+/gm, ` `)}:{" "}
                  <strong>
                    {value.from < -120 ? "-Inf" : value.from} to{" "}
                    {value.to > -50 ? "0" : value.to} dBm
                  </strong>
                  <Icon name="delete" />
                </Label>
              );
            }
            break;
          default:
            break;
        }
      }
    }
    return labels;
  };

  const toggleDeviceTypeFilter = () => {
    // toggle column device by gateway/device/all
    const order = [null, "gateway", "device"];
    const nextType =
      order[(order.indexOf(deviceTypeFilter) + 1) % order.length];
    const newCriteria = { type: nextType };
    setDeviceTypeFilter(nextType);
    resourceUsageStore.setCriteria(newCriteria);
  };

  const handlePaginationChange = (e, { activePage }) => {
    resourceUsageStore.setActivePage(activePage);
  };

  const handleSort = (field) => {
    resourceUsageStore.handleSort(field);
  };

  const pageSizeOptions = [
    { key: 1, text: "Show 50", value: 50 },
    { key: 2, text: "Show 25", value: 25 },
    { key: 3, text: "Show 10", value: 10 },
  ];

  useEffect(() => {
    resourceUsageStore.getAssets();
    return () => {
      resourceUsageStore.deleteCriteria();
    };
  }, []);

  return (
    <div className="app-body-container-view">
      <div className="animated fadeIn animation-view">
        <div className="view-header">
          <h1 className="mb0">NETWORK OVERVIEW</h1>
          <div className="view-header-actions">
            {!showFilters && (
              <div onClick={() => setShowFilters(true)}>
                <i className="fas fa-eye" />
                <span>SHOW SEARCH AND CHARTS</span>
              </div>
            )}
            {showFilters && (
              <div
                onClick={() => setShowFilters(false)}
                style={{ color: "gray" }}
              >
                <i className="fas fa-eye-slash" />
                <span>HIDE SEARCH AND CHARTS</span>
              </div>
            )}
          </div>
        </div>
        {showFilters && <ResourceUssageGraph />}
        <div className="view-body">
          <div className="table-container">
            <div className="table-container-box">
              <Segment>
                {showFilters && !resourceUsageStore.model.isLoading && (
                  <React.Fragment>
                    <Grid>
                      <Grid.Row>
                        <Grid.Column width={12}>
                          <label style={{ fontWeight: "bolder" }}>
                            Filters:{" "}
                          </label>
                          {showAppliedFilters()}
                          <span
                            className="range-select"
                            onClick={() => clearFilters()}
                          >
                            Clear
                          </span>
                          <div className="sort-by">
                            <label className="sort-and-filters-labels">
                              Sort by:{" "}
                            </label>
                            <Button.Group size="tiny" className="sort-buttons">
                              <Button
                                color={
                                  resourceUsageStore.model.orderBy[0] ===
                                  "last_activity"
                                    ? "blue"
                                    : ""
                                }
                                onClick={() => handleSort("last_activity")}
                              >
                                {resourceUsageStore.model.orderBy[0] ===
                                "last_activity"
                                  ? "Last message (" +
                                    resourceUsageStore.model.orderBy[1].toLowerCase() +
                                    ")"
                                  : "Last message "}
                              </Button>
                              <Button
                                color={
                                  resourceUsageStore.model.orderBy[0] ===
                                  "npackets_lost"
                                    ? "blue"
                                    : ""
                                }
                                onClick={() => handleSort("npackets_lost")}
                              >
                                {resourceUsageStore.model.orderBy[0] ===
                                "npackets_lost"
                                  ? "Packets lost (" +
                                    resourceUsageStore.model.orderBy[1].toLowerCase() +
                                    ")"
                                  : "Packets lost"}
                              </Button>
                              <Button
                                color={
                                  resourceUsageStore.model.orderBy[0] ===
                                  "activity_freq"
                                    ? "blue"
                                    : ""
                                }
                                onClick={() => handleSort("activity_freq")}
                              >
                                {resourceUsageStore.model.orderBy[0] ===
                                "activity_freq"
                                  ? "Activity freq. (" +
                                    resourceUsageStore.model.orderBy[1].toLowerCase() +
                                    ")"
                                  : "Activity freq."}
                              </Button>
                              <Button
                                color={
                                  resourceUsageStore.model.orderBy[0] ===
                                  "max_rssi"
                                    ? "blue"
                                    : ""
                                }
                                onClick={() => handleSort("max_rssi")}
                              >
                                {resourceUsageStore.model.orderBy[0] ===
                                "max_rssi"
                                  ? "RSSI (" +
                                    resourceUsageStore.model.orderBy[1].toLowerCase() +
                                    ")"
                                  : "RSSI "}
                              </Button>
                              <Button
                                color={
                                  resourceUsageStore.model.orderBy[0] ===
                                  "max_lsnr"
                                    ? "blue"
                                    : ""
                                }
                                onClick={() => handleSort("max_lsnr")}
                              >
                                {resourceUsageStore.model.orderBy[0] ===
                                "max_lsnr"
                                  ? "SNR (" +
                                    resourceUsageStore.model.orderBy[1].toLowerCase() +
                                    ")"
                                  : "SNR "}
                              </Button>
                              <Button
                                icon="remove"
                                onClick={() => handleSort("")}
                              ></Button>
                            </Button.Group>
                          </div>
                        </Grid.Column>
                        <Grid.Column width={4}>
                          {" "}
                          <div className="right pull-right aligned">
                            Page{" "}
                            <strong>
                              {resourceUsageStore.model.activePage}
                            </strong>{" "}
                            of{" "}
                            <strong>
                              {resourceUsageStore.model.totalPages}
                            </strong>{" "}
                            - Total Results:{" "}
                            <strong>
                              {resourceUsageStore.model.totalList}
                            </strong>
                          </div>
                        </Grid.Column>
                      </Grid.Row>
                    </Grid>
                  </React.Fragment>
                )}
                {!resourceUsageStore.model.isLoading && (
                  <ResourceUsageList
                    list={resourceUsageStore.model.list}
                    criteria={resourceUsageStore.getCriteria()}
                    isLoading={resourceUsageStore.model.isLoading}
                    deviceTypeClick={toggleDeviceTypeFilter}
                  ></ResourceUsageList>
                )}
                {resourceUsageStore.model.isLoading && (
                  <LoaderComponent
                    loadingMessage="Loading network overview..."
                    style={{ marginBottom: 20 }}
                  />
                )}
                {!resourceUsageStore.model.isLoading &&
                  resourceUsageStore.model.totalPages > 1 && (
                    <Grid className="segment centered">
                      <Pagination
                        className=""
                        activePage={resourceUsageStore.model.activePage}
                        onPageChange={handlePaginationChange}
                        totalPages={resourceUsageStore.model.totalPages}
                      />
                      {!resourceUsageStore.model.isLoading &&
                        resourceUsageStore.model.totalPages > 1 && (
                          <Menu compact>
                            <Dropdown
                              className=""
                              text={"Show " + resourceUsageStore.model.pageSize}
                              options={pageSizeOptions}
                              onChange={handlePageSizeChange}
                              item
                            />
                          </Menu>
                        )}
                    </Grid>
                  )}
              </Segment>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default observer(ResourceUsageComponent);
