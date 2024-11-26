import React from "react";
import { Link } from "react-router-dom";
import _ from "lodash";
import "./asset-link.component.css";

const AssetLinkComponent = (props) => {
  const { title, id, type } = props;
  const assetType = type ? type : "device";
  const normalizedType = assetType && assetType.toLowerCase().trim();
  if (
    !_.isNull(id) &&
    !_.isUndefined(id) &&
    ["gateway", "device"].includes(normalizedType)
  ) {
    return (
      <React.Fragment>
        <Link
          className="hover-underline"
          target="_blank"
          to={`/dashboard/assets/${normalizedType}/${id}/view`}
          rel="noopener noreferrer"
        >
          {title}
        </Link>
      </React.Fragment>
    );
  } else {
    return title;
  }
};

export default AssetLinkComponent;
